'use strict';
const {spawnSync}=require('child_process');
process.exit(spawnSync(process.execPath,['--test','tests/separate.test.js'],{stdio:'inherit'}).status||0);
