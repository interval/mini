import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
// import App from './App'
// import { routes } from './routes'
import './styles/globals.css'
import 'react-loading-skeleton/dist/skeleton.css'
import 'form-request-submit-polyfill'

import { INPUT_SCHEMAS } from '../../sdk/src/ioSchema'
import ActionList from './pages/ActionList'
import { QueryClient, QueryClientProvider } from 'react-query'

console.log('logging input schemas')
console.log(INPUT_SCHEMAS)

declare global {
  interface Window {
    gtag?: any
  }
}

const container = document.getElementById('root')
if (!container) throw new Error('Missing root element')

const queryClient = new QueryClient()

const root = createRoot(container)

root.render(
  <BrowserRouter>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <h1 className="text-green-500">Interval</h1>
        <Routes>
          <Route path="/" element={<ActionList />} />
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
      </QueryClientProvider>
    </HelmetProvider>
  </BrowserRouter>
)
