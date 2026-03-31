#!/usr/bin/env python3
"""Migrates GraphQL functions from CLI to SDK."""
import sys, os, re, json, subprocess

TOOLS_DIR = "/Users/michaelfarrell/transcend/tools"
CLI_GQL_DIR = f"{TOOLS_DIR}/packages/cli/src/lib/graphql"
SDK_SRC_DIR = f"{TOOLS_DIR}/packages/sdk/src"

def read_file(path):
    with open(path) as f:
        return f.read()

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)

def transform_sdk_imports(content, gql_mapping):
    """Transform CLI imports to SDK-relative imports."""
    # makeGraphQLRequest
    content = content.replace(
        "import { makeGraphQLRequest } from '@transcend-io/sdk';",
        "import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';"
    )
    # logger
    content = content.replace(
        "import { logger } from '../../logger.js';",
        "import { logger } from '../logger.js';"
    )
    # GQL imports from barrel -> direct file
    for gql_const, gql_file in gql_mapping.items():
        # This handles the case where the import is from ./gqls/index.js
        pass
    # Replace all ./gqls/index.js imports with direct imports
    gql_import_re = re.compile(r"import \{([^}]+)\} from './gqls/index\.js';")
    def replace_gql_import(m):
        imports = [i.strip() for i in m.group(1).split(',') if i.strip()]
        # Group imports by their source file
        file_groups = {}
        for imp in imports:
            for const_name, file_name in gql_mapping.items():
                if imp == const_name:
                    file_groups.setdefault(file_name, []).append(imp)
                    break
        lines = []
        for file_name, consts in sorted(file_groups.items()):
            lines.append(f"import {{ {', '.join(consts)} }} from './gqls/{file_name}.js';")
        return '\n'.join(lines) if lines else m.group(0)
    content = gql_import_re.sub(replace_gql_import, content)
    return content

def remove_codecs_import_and_define_types(content, type_defs):
    """Remove ../../codecs.js imports and add type definitions."""
    codecs_re = re.compile(r"import \{[^}]+\} from '../../codecs\.js';\n?")
    if codecs_re.search(content):
        content = codecs_re.sub('', content)
        # Add type defs after the last import
        last_import = 0
        for m in re.finditer(r'^import .+;$', content, re.MULTILINE):
            last_import = m.end()
        if type_defs and last_import:
            content = content[:last_import] + '\n\n' + type_defs + content[last_import:]
    return content

def fix_err_unknown(content):
    """Fix 'err' is of type 'unknown' TypeScript errors."""
    content = re.sub(r'\$\{err\.message\}', '${(err as Error).message}', content)
    return content

def get_exported_names(filepath):
    """Get all exported names from a TS file."""
    content = read_file(filepath)
    names = set()
    for m in re.finditer(r'export\s+(?:async\s+)?(?:function|const|interface|type|class|enum)\s+(\w+)', content):
        names.add(m.group(1))
    for m in re.finditer(r'export\s+\{([^}]+)\}', content):
        for name in m.group(1).split(','):
            name = name.strip().split(' as ')[-1].strip()
            if name:
                names.add(name)
    return names

def build_gql_mapping(gql_files, gql_src_dir):
    """Build mapping of GQL constant name -> filename (without extension)."""
    mapping = {}
    for gql_file in gql_files:
        src = os.path.join(gql_src_dir, gql_file)
        content = read_file(src)
        for m in re.finditer(r'export const (\w+)', content):
            mapping[m.group(1)] = os.path.splitext(gql_file)[0]
    return mapping

def migrate(theme, func_files, gql_files, type_defs_map=None, extra_imports_fix=None):
    """
    Main migration function.
    
    theme: target folder name (e.g. 'administration')
    func_files: list of function file names
    gql_files: list of gql file names
    type_defs_map: dict of {filename: type_definitions_string}
    extra_imports_fix: list of (filepath, old_import, new_import) tuples
    """
    type_defs_map = type_defs_map or {}
    extra_imports_fix = extra_imports_fix or []
    
    sdk_theme_dir = f"{SDK_SRC_DIR}/{theme}"
    sdk_gqls_dir = f"{sdk_theme_dir}/gqls"
    os.makedirs(sdk_gqls_dir, exist_ok=True)
    
    # Create logger if not exists
    logger_path = f"{SDK_SRC_DIR}/logger.ts"
    if not os.path.exists(logger_path):
        write_file(logger_path, "export const logger = console;\n")
    
    # Build GQL mapping
    gql_mapping = build_gql_mapping(gql_files, f"{CLI_GQL_DIR}/gqls")
    
    # Move GQL files (as-is)
    for gql_file in gql_files:
        src = f"{CLI_GQL_DIR}/gqls/{gql_file}"
        dst = f"{sdk_gqls_dir}/{gql_file}"
        content = read_file(src)
        write_file(dst, content)
        os.remove(src)
    
    # Move function files (with transforms)
    all_exported = set()
    for func_file in func_files:
        src = f"{CLI_GQL_DIR}/{func_file}"
        dst = f"{sdk_theme_dir}/{func_file}"
        content = read_file(src)
        content = transform_sdk_imports(content, gql_mapping)
        content = fix_err_unknown(content)
        if func_file in type_defs_map:
            content = remove_codecs_import_and_define_types(content, type_defs_map[func_file])
        all_exported.update(get_exported_names(src) if os.path.exists(src) else set())
        write_file(dst, content)
    # Collect exports before deleting
    all_exported = set()
    for func_file in func_files:
        dst = f"{sdk_theme_dir}/{func_file}"
        all_exported.update(get_exported_names(dst))
    # Now delete originals
    for func_file in func_files:
        src = f"{CLI_GQL_DIR}/{func_file}"
        if os.path.exists(src):
            os.remove(src)
    
    # Create barrel
    barrel_lines = [f"export * from './{os.path.splitext(f)[0]}.js';" for f in sorted(func_files)]
    write_file(f"{sdk_theme_dir}/index.ts", '\n'.join(barrel_lines) + '\n')
    
    # Update SDK root barrel
    sdk_index = read_file(f"{SDK_SRC_DIR}/index.ts")
    export_line = f"export * from './{theme}/index.js';"
    if export_line not in sdk_index:
        sdk_index = sdk_index.rstrip() + f"\n{export_line}\n"
        write_file(f"{SDK_SRC_DIR}/index.ts", sdk_index)
    
    # Update CLI barrel - remove moved file exports
    cli_barrel = read_file(f"{CLI_GQL_DIR}/index.ts")
    for func_file in func_files:
        stem = os.path.splitext(func_file)[0]
        line = f"export * from './{stem}.js';"
        cli_barrel = cli_barrel.replace(line + '\n', '')
        cli_barrel = cli_barrel.replace(line, '')
    write_file(f"{CLI_GQL_DIR}/index.ts", cli_barrel)
    
    # Update CLI gqls barrel
    gqls_barrel = read_file(f"{CLI_GQL_DIR}/gqls/index.ts")
    for gql_file in gql_files:
        stem = os.path.splitext(gql_file)[0]
        line = f"export * from './{stem}.js';"
        gqls_barrel = gqls_barrel.replace(line + '\n', '')
        gqls_barrel = gqls_barrel.replace(line, '')
    write_file(f"{CLI_GQL_DIR}/gqls/index.ts", gqls_barrel)
    
    # Fix imports across CLI codebase
    for fix in extra_imports_fix:
        filepath, old, new = fix
        full_path = f"{TOOLS_DIR}/{filepath}"
        if os.path.exists(full_path):
            content = read_file(full_path)
            content = content.replace(old, new)
            write_file(full_path, content)
    
    # Search and fix remaining broken imports
    cli_src = f"{TOOLS_DIR}/packages/cli/src"
    for root, dirs, files in os.walk(cli_src):
        for fname in files:
            if not fname.endswith('.ts'):
                continue
            fpath = os.path.join(root, fname)
            content = read_file(fpath)
            changed = False
            for func_file in func_files:
                stem = os.path.splitext(func_file)[0]
                # Fix direct relative imports to the moved file
                patterns = [
                    f"from './{stem}.js'",
                    f"from '../graphql/{stem}.js'",
                    f"from './graphql/{stem}.js'",
                ]
                for pat in patterns:
                    if pat in content:
                        # Extract what's imported
                        import_re = re.compile(rf"import\s+\{{([^}}]+)\}}\s+from\s+'{re.escape(pat[6:])}';")
                        for m in import_re.finditer(content):
                            imports_str = m.group(1)
                            # Separate type and value imports
                            type_imports = []
                            value_imports = []
                            for imp in [i.strip() for i in imports_str.split(',') if i.strip()]:
                                imp_clean = imp.replace('type ', '')
                                if imp.startswith('type ') or imp_clean in all_exported and not any(
                                    re.search(rf'export\s+(?:async\s+)?function\s+{re.escape(imp_clean)}', read_file(f"{sdk_theme_dir}/{func_file}"))
                                    for _ in [1] if os.path.exists(f"{sdk_theme_dir}/{func_file}")
                                ):
                                    pass
                                value_imports.append(imp_clean)
                            new_import = f"import {{ {', '.join(value_imports)} }} from '@transcend-io/sdk';"
                            content = content.replace(m.group(0), new_import)
                            changed = True
            if changed:
                write_file(fpath, content)
    
    print(f"Migration complete: {theme}")
    print(f"  Function files: {func_files}")
    print(f"  GQL files: {gql_files}")
    print(f"  Exported names: {all_exported}")

if __name__ == '__main__':
    print("Migration script loaded. Call migrate() with arguments.")
