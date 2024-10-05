import React, { useState } from 'react'
import axios from 'axios'
import { Navigate } from 'react-router-dom'
import { Container, TextInput, PasswordInput, Tabs, Center, AppShell, Paper, Space, Text, Button } from '@mantine/core'
import { Form } from '@mantine/form'
import socket from '../../utils/socket'

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [email, setEmail] = useState('')
    const [serverResponse, setServerResponse] = useState('')
    const [access_token, setAccess_token] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (username === '' || password === '') {
            alert('Please fill in all fields')
            return
        }
        try {
            const response = await axios.post('http://localhost:8000/login', {
                username,
                password,
            })
            if (response.status === 200) {
                const access_token = response.data.access_token
                const userId = response.data.user_id
                localStorage.setItem('access_token', access_token)
                socket.io.opts.extraHeaders = {
                    Authorization: `Bearer ${access_token}`,
                }
                localStorage.setItem('user_id', userId)
                socket.disconnect().connect()
                setAccess_token(access_token)
            } else {
                setServerResponse('Login failed')
            }
        } catch (error) {
            console.log(error)
            setServerResponse('Login failed')
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (username === '' || password === '') {
            alert('Please fill in all fields')
            return
        }
        try {
            const response = await axios.post('http://localhost:8000/register', {
                username,
                password,
                email,
            })
            if (response.status === 201) {
                const access_token = response.data.access_token
                localStorage.setItem('access_token', access_token)
                setAccess_token(access_token)
            } else {
                setServerResponse('Register failed')
            }
        } catch (error) {
            setServerResponse('Register failed')
        }
    }

    return (
        <AppShell style={{ height: '100vh' }}>
            <Center>
                {access_token && <Navigate to="/documents" />}
                <Paper shadow="lg" withBorder radius="md" p={40} style={{ position: 'absolute', top: 300 }}>
                    <Container size={800} w={400}>
                        <Tabs variant="outline" defaultValue="login">
                            <Tabs.List>
                                <Tabs.Tab value="login">Login</Tabs.Tab>
                                <Space w="lg" />
                                <Tabs.Tab value="register">Register</Tabs.Tab>
                            </Tabs.List>
                            <Tabs.Panel value="login" p={30}>
                                <TextInput
                                    label="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.currentTarget.value)}
                                />
                                <Space h="lg" />
                                <PasswordInput
                                    label="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.currentTarget.value)}
                                />
                                <Space h="lg" />
                                <Button onClick={handleLogin} type="submit">
                                    Login
                                </Button>
                                <Text>{serverResponse}</Text>
                            </Tabs.Panel>
                            <Tabs.Panel value="register" p={30}>
                                <TextInput
                                    label="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.currentTarget.value)}
                                />
                                <Space h="lg" />
                                <TextInput
                                    label="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.currentTarget.value)}
                                />
                                <Space h="lg" />
                                <PasswordInput
                                    label="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.currentTarget.value)}
                                />
                                <Space h="lg" />
                                <Button onClick={handleRegister} type="submit">
                                    Register
                                </Button>
                                <Text>{serverResponse}</Text>
                            </Tabs.Panel>
                        </Tabs>
                    </Container>
                </Paper>
            </Center>
        </AppShell>
    )
}

export default LoginPage
