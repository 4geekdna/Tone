'use strict';
const {spawnSync}=require('child_process');
const r=spawnSync(process.execPath,['--test','tests/govee-client.test.js'],{stdio:'inherit'});
process.exit(r.status==null?1:r.status);
