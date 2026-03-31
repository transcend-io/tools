"""Reusable helper: strip colors import + wrappers from TypeScript source."""
import re

def strip_colors(content: str) -> str:
    """Remove `import colors from 'colors'` and unwrap all colors.X(...) calls."""
    content = re.sub(r"import colors from 'colors';\n", '', content)
    result = []
    i = 0
    while i < len(content):
        m = re.match(r'colors\.\w+\(', content[i:])
        if m:
            # Find matching closing paren
            start = i + len(m.group())
            depth = 1
            j = start
            while j < len(content) and depth > 0:
                if content[j] == '(':
                    depth += 1
                elif content[j] == ')':
                    depth -= 1
                j += 1
            result.append(content[start:j-1])
            i = j
        else:
            result.append(content[i])
            i += 1
    return ''.join(result)

def strip_colors_in_dir(dirpath: str) -> None:
    import os
    for fname in os.listdir(dirpath):
        if not fname.endswith('.ts'):
            continue
        fpath = os.path.join(dirpath, fname)
        with open(fpath) as f:
            c = f.read()
        if 'colors' in c:
            new_c = strip_colors(c)
            with open(fpath, 'w') as f:
                f.write(new_c)
            print(f"Stripped colors from {fname}")
