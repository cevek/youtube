import * as Koa from 'koa';
import {createPackerInstance} from './config';
import * as Router from 'koa-router';
import {readFileSync} from 'fs';
import {exec, ExecOptions} from 'child_process';
import {query} from '../../backend/src/db';

const serve = require('koa-static'); 
const port = 5000;
const app = new Koa();
app.listen(port);
console.log('App listening at http://localhost:' + port + '/');
const packer = createPackerInstance();
const router = new Router();

packer.run({watch: true});
app.use(router.routes());
app.use(router.allowedMethods());

router.get('/api/videos/:date/', async (ctx, next) => {
    var date = ctx.params.date;
    var videos = await query('SELECT * FROM videos WHERE ytEnCaptionId IS NOT NULL AND date = ? ORDER BY views DESC', [date]);
    ctx.body = videos;
}) 

app.use(async (ctx, next) => {
    await next();
    if (ctx.status === 404) {
        ctx.body = readFileSync(packer.options.dest + '/index.html', 'utf-8');
        ctx.status = 200;
    }
});


app.use(serve(packer.options.dest));