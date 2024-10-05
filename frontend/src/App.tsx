import './App.css'
import LoginPage from './pages/login/login'
import DocumentList from './pages/documentsList/DocumentList'
import DocumentEditor from './pages/documentEditor/DocumentEditor'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
// core styles are required for all packages
import '@mantine/core/styles.css'

const browserRouter = createBrowserRouter([
    {
        path: '/',
        element: <LoginPage />,
    },
    {
        path: '/documents',
        element: <DocumentList />,
    },
    {
        path: '/documents/:id',
        element: <DocumentEditor />,
    },
])

function App() {
    return (
        <MantineProvider defaultColorScheme="dark">
            <RouterProvider router={browserRouter} />
        </MantineProvider>
    )
}

export default App
