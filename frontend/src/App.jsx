import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'

import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import NavBar from './components/NavBar'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
function App() {
  return (
    <>
      <NavBar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/register" element={<RegisterPage/>}/>
      </Routes>
    </>
  )
}

export default App
