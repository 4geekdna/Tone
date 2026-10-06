'use strict';
/* Bridge gate for WP0a. Not a *.test.js file. Exit 0 on pass. */
const {spawnSync}=require('child_process');
const r=spawnSync(process.execPath,['--test','tests/govee-safety.test.js'],{stdio:'inherit'});
process.exit(r.status==null?1:r.status);
