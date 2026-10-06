'use strict';
const {spawnSync}=require('child_process');
process.exit(spawnSync(process.execPath,['--test','tests/color-mix.test.js'],{stdio:'inherit'}).status||0);
