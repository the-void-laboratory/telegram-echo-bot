import http from 'http';
import { renderWebApp } from '../web/app.js';
export function createServer() { return http.createServer((req, res) => { res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' }); res.end(renderWebApp()); }); }
