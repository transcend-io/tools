import { defineRegistry } from '@json-render/react';

import { catalog } from '../../catalog.ts';
import { Grid } from './components/Grid.tsx';
import { Heading } from './components/Heading.tsx';
import { MetricCard } from './components/MetricCard.tsx';
import { ProgressBar } from './components/ProgressBar.tsx';

/**
 * Browser registry that maps catalog component names to React implementations.
 *
 * Consumed only by the json-render MCP App view — never imported from Node code.
 */
export const { registry } = defineRegistry(catalog, {
  components: {
    Heading: ({ props }) => <Heading props={props} />,
    MetricCard: ({ props }) => <MetricCard props={props} />,
    ProgressBar: ({ props }) => <ProgressBar props={props} />,
    Grid: ({ props, children }) => <Grid props={props}>{children}</Grid>,
  },
});
