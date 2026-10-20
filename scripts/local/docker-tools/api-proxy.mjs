import net from 'node:net';
if(process.platform!=='linux'||process.cwd()!=='/workspace')throw new Error('Docker-only project root required');
const server=net.createServer(client=>{const upstream=net.connect({host:'supabase_kong_aba-reintegration-local',port:8000});client.pipe(upstream);upstream.pipe(client);upstream.on('error',()=>client.destroy());client.on('error',()=>upstream.destroy());client.on('close',()=>upstream.destroy());});
server.listen(54321,'127.0.0.1');
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));