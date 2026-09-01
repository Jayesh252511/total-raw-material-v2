import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'
import './styles.css'

if (typeof window !== "undefined") {
  if (localStorage.getItem("theme") === "dark" || (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

const router = getRouter()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background text-muted-foreground animate-pulse font-medium">Initializing ERP...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  </React.StrictMode>,
)
