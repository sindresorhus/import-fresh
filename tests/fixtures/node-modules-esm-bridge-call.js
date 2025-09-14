import incrementWorkspaceModule from './node_modules/stateful-esm-bridge/index.mjs';

const value = await incrementWorkspaceModule();

export default value;
