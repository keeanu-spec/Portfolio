const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    
    // Quitar barras o parametros de consulta si los hubiera
    const cleanPath = pathname.split('?')[0];
    const file = Bun.file('.' + cleanPath);
    
    return file.exists().then(exists => {
      if (exists) {
        const headers = new Headers();
        if (/\.(glb|gltf|bin|mp4|png|jpeg|jpg|svg|woff2?)$/i.test(cleanPath)) {
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
        return new Response(file, { headers });
      }
      return new Response('404: Archivo no encontrado', { status: 404 });
    });
  },
});

console.log(`Servidor local activo en http://localhost:${server.port}`);
