import react, { useState, useEffect } from 'react'
import axios from '../../utils/axios'
import { Link } from 'react-router-dom'
import {
    AppShell,
    Center,
    Paper,
    Title,
    Text,
    NavLink,
    Card,
    Space,
    Container,
    Box,
    Grid,
    Flex,
    Button,
    Modal,
    TextInput,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { doc } from 'prettier'

type Document = {
    id: number
    name: string
    owner: string
}

function DocumentCard({ document, shared }: { document: Document; shared?: boolean }) {
    const [opened, { open, close }] = useDisclosure(false)

    const deleteDocument = () => {
        axios.delete(`http://localhost:8000/documents/${document.id}`).then(() => {
            window.location.reload()
        })
    }
    return (
        <Card shadow="sm" miw={250} m={24} pt={24} px={24} radius="md" withBorder>
            <Text>{document.name}</Text>
            <Space h="lg" />
            <Flex direction="row">
                <Text>
                    <Link to={`/documents/${document.id}`} style={{ color: 'white' }}>
                        Edit
                    </Link>
                </Text>
                <Space w={24} />
                {!shared && (
                    <Text onClick={open} td="underline" style={{ cursor: 'pointer' }}>
                        <a>Delete</a>
                    </Text>
                )}
            </Flex>
            <Modal opened={opened} onClose={close} title="Are you sure you want to delete this doc?">
                <Space h="lg" />
                <Flex direction="row">
                    <Button onClick={deleteDocument}>Delete</Button>
                    <Space w="lg" />
                    <Button onClick={close}>Cancel</Button>
                </Flex>
            </Modal>
        </Card>
    )
}

export default function DocumentList() {
    const [documents, setDocuments] = useState([] as Document[])
    const [collaborations, setCollaborations] = useState([] as Document[])
    const [opened, { open, close }] = useDisclosure(false)
    const [newDocumentName, setNewDocumentName] = useState('')
    const [newDocumentError, setNewDocumentError] = useState('')

    useEffect(() => {
        axios.get('http://localhost:8000/documents').then((response) => {
            console.log(documents)
            setDocuments(response.data.documents)
        })
    }, [])

    useEffect(() => {
        axios.get('http://localhost:8000/collaborations').then((response) => {
            setCollaborations(response.data.collaborations)
        })
    }, [])

    const createNewDocument = () => {
        if (newDocumentName === '') {
            setNewDocumentError('Document name cannot be empty')
            return
        }
        axios.post('http://localhost:8000/documents', { name: newDocumentName }).then((response) => {
            setDocuments([...documents, response.data.document])
            close()
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
                <NavLink label="Documents" active />
                <NavLink label="Logout" href="/" onClick={() => localStorage.removeItem('access_token')} />
            </AppShell.Navbar>
            <AppShell.Main>
                <Container>
                    <Flex direction="row" justify="space-between">
                        <Title size="xl">My documents</Title>
                        <Button onClick={open}>Create</Button>
                        <Modal title="Create Document" opened={opened} onClose={close}>
                            <TextInput
                                label="Document Name"
                                error={newDocumentError}
                                onChange={(e) => {
                                    setNewDocumentName(e.target.value)
                                    setNewDocumentError('')
                                }}
                            />
                            <Space h="lg" />
                            <Button onClick={createNewDocument}>Create</Button>
                        </Modal>
                    </Flex>
                    {documents.length === 0 && <Text>No documents yet</Text>}
                    <Grid p={24}>
                        {documents.map((document) => (
                            <DocumentCard key={document.id} document={document} shared={false} />
                        ))}
                    </Grid>
                    <Title size="xl">Collaborations</Title>
                    <Grid p={24}>
                        {collaborations.length === 0 && <Text>No active collaborations</Text>}
                        {collaborations.map((document) => (
                            <DocumentCard key={document.id} document={document} shared={true} />
                        ))}
                    </Grid>
                </Container>
            </AppShell.Main>
        </AppShell>
    )
}
