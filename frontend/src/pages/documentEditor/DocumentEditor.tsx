import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from '../../utils/axios'
import ReactQuill, { Quill } from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import {
    AppShell,
    Button,
    Container,
    Divider,
    Flex,
    Group,
    NavLink,
    Paper,
    Space,
    Text,
    TextInput,
} from '@mantine/core'
import socket from '../../utils/socket'
import { io } from 'socket.io-client'

interface Document {
    id: number
    content: string
    collaborators: string[]
    owner: number
}

const fixBrTag = (text: string) => {
    if (text && text.substr(text.length - 11) == '<p><br></p>') {
        console.log('FIXING BR TAG')
        text = text.substr(0, text.length - 11) + '<p><br>&#8205;</p>'
        return text
    }
    return text
}

export default function DocumentEditor() {
    const { id } = useParams()
    const [document, setDocument] = useState<Document>()
    const [content, setContent] = useState('')
    const [collaborators, setCollaborators] = useState<string[]>([])
    const [newCollaborator, setNewCollaborator] = useState('')
    const [error, setError] = useState('')
    const user_id = localStorage.getItem('user_id')

    const onDoucmentChange = useCallback(
        (value: string) => {
            const content = value
            setContent(fixBrTag(content))
            console.log('DATA SENT TO SERVER W/ USER', user_id, content)
            socket.emit('document_updated', { id, content })
        },
        [id],
    )

    useEffect(() => {
        socket.on('document_broadcast', (data: any) => {
            setContent(data.content)
        })
    }, [])

    useEffect(() => {
        axios.get(`http://localhost:8000/documents/${id}`).then((response) => {
            setDocument(response.data.document)
            setContent(fixBrTag(response.data.document.content))
            socket.emit('join_document', { document_id: id })
        })
        return () => {
            socket.emit('leave_document', { document_id: id })
        }
    }, [])

    useEffect(() => {
        axios.get(`http://localhost:8000/documents/${id}/collaborators`).then((response) => {
            setCollaborators(response.data.collaborators)
        })
    }, [])

    const addNewCollaborator = () => {
        axios
            .post(`http://localhost:8000/documents/${id}/collaborators`, {
                collaborator_email: newCollaborator,
            })
            .then((response) => {
                if (response.status === 201) {
                    setCollaborators([...collaborators, newCollaborator])
                } else {
                    setError(response.data.message)
                }
            })
            .catch((error) => {
                console.log(error)
                setError(error.response.data.message)
            })
    }
    const removeCollaborator = (collaborator: string) => {
        axios
            .delete(`http://localhost:8000/documents/${id}/collaborators`, {
                data: { collaborator_email: collaborator },
            })
            .then((response) => {
                if (response.status === 200) {
                    setCollaborators(collaborators.filter((c) => c !== collaborator))
                }
            })
            .catch((error) => {
                console.log(error)
            })
    }

    return (
        <AppShell
            navbar={{
                width: 300,
                breakpoint: 'sm',
            }}
            padding="lg"
        >
            <AppShell.Navbar mt={20}>
                <NavLink label="Documents" href="/documents" />
                <NavLink label="Logout" href="/" onClick={() => localStorage.removeItem('access_token')} />
            </AppShell.Navbar>
            <AppShell.Main>
                <Container>
                    <Container>
                        <h2>Document Editor</h2>
                        <ReactQuill
                            theme="snow"
                            value={content}
                            onChange={onDoucmentChange}
                            preserveWhitespace
                            style={{ height: '400px' }}
                        />
                    </Container>
                    <Space h="lg" />
                    <Space h="lg" />
                    <Space h="lg" />
                    <Space h="lg" />
                    <Space h="lg" />
                    <Space h="lg" />
                    <Divider />
                    <Space h="lg" />
                    <Group justify="center">
                        <TextInput
                            placeholder="Add collaborator"
                            onChange={(e) => {
                                setNewCollaborator(e.target.value)
                                setError('')
                            }}
                            error={error}
                        />
                        <Button type="button" title="Add" onClick={addNewCollaborator}>
                            Add Collaborator
                        </Button>
                    </Group>
                    <Space h="lg" />
                    <Container>
                        {collaborators &&
                            collaborators.map((collaborator: any) => (
                                <Paper key={collaborator} p={8} withBorder shadow="lg" mb={16}>
                                    <Flex justify="space-between" direction="row">
                                        <Text>{collaborator}</Text>
                                        <Button
                                            onClick={() => {
                                                removeCollaborator(collaborator)
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    </Flex>
                                </Paper>
                            ))}
                    </Container>
                </Container>
            </AppShell.Main>
        </AppShell>
    )
}
