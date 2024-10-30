import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { Toaster } from "@/components/ui/sonner"
import './index.css'
import { RecoilRoot } from 'recoil'

import { Buffer } from 'buffer'
window.Buffer = Buffer

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RecoilRoot>
      <App />
      <Toaster />
    </RecoilRoot>
  </StrictMode>,
)
