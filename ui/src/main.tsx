// import viteSSR from 'vite-ssr/react'
import React, { Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
// import App from './App'
// import { routes } from './routes'
import './styles/globals.css'
import 'react-loading-skeleton/dist/skeleton.css'
import 'form-request-submit-polyfill'

declare global {
  interface Window {
    gtag?: any
  }
}

const container = document.getElementById('root')
if (!container) throw new Error('Missing root element')

const root = createRoot(container)

root.render(
  <BrowserRouter>
    <HelmetProvider>
      <h1 className="text-green-500">Hello World??</h1>
      <Routes>
        <Route
          path="/actions"
          element={
            <h1>
              actions!!!! <Link to="/page">page</Link>
            </h1>
          }
        />
        <Route
          path="/page"
          element={
            <h1>
              page <Link to="/actions">actions!</Link>
            </h1>
          }
        />
      </Routes>
    </HelmetProvider>
  </BrowserRouter>
)
