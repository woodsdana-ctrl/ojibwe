import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await rm(new URL('dist/',root),{recursive:true,force:true});
await mkdir(new URL('dist/',root),{recursive:true});
await copyFile(new URL('index.html',root),new URL('dist/index.html',root));
await cp(new URL('src/',root),new URL('dist/src/',root),{recursive:true});
await cp(new URL('assets/',root),new URL('dist/assets/',root),{recursive:true});
for(const name of ['TEACHER_GUIDE.md','CONTENT_REVIEW.md','SOURCE_NOTES.md','WALKTHROUGH.md'])await copyFile(new URL(name,root),new URL('dist/'+name,root));
console.log('Static website built in dist/ (no dependencies or compilation required).');
