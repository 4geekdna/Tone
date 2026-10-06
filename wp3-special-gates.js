'use strict';
const {spawnSync}=require('child_process');
process.exit(spawnSync(process.execPath,['--test','tests/special-lights.test.js'],{stdio:'inherit'}).status||0);
