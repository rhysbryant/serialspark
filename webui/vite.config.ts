import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		rollupOptions: {
		  input: ["index.html","@xterm/xterm"]/*{
			xterm: "xterm/",
			'index.html': "index.html",
			"m.js":'src/plugins/Example/exampleTab.tsx'
		  }*/,
		  external:[
			/^plugin.*$/
		  ]
		},
	  },
	plugins: [preact({})],
});
