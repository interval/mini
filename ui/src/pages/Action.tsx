import { useParams } from 'react-router-dom'
import { useRpcQuery } from '../rpcClient'
import { useEffect } from 'react'

function Transaction({ id }: { id: number }) {
  const transactionState = useRpcQuery('get_transaction_state', {
    transactionId: id,
  })

  useEffect(() => {
    console.log('>>>', transactionState.data)
  }, [transactionState.data])

  const { refetch } = transactionState
  useEffect(() => {
    if (!id) return
    // First, we need to create an instance of EventSource and pass the data stream URL as a
    // parameter in its constructor
    const es = new EventSource(`/api/events/${id}`)
    // Whenever the connection is established between the server and the client we'll get notified
    es.onopen = () => console.log('>>> Connection opened!')
    // Made a mistake, or something bad happened on the server? We get notified here
    es.onerror = e => console.log('ERROR!', e)
    // This is where we get the messages. The event is an object and we're interested in its `data` property
    es.onmessage = e => {
      console.log('on message')
      refetch()
    }
    // Whenever we're done with the data stream we must close the connection
    return () => es.close()
  }, [id, refetch])

  if (!transactionState.data) {
    return <div>Loading...</div>
  }

  return <pre>{JSON.stringify(transactionState.data, null, 2)}</pre>
}

function StartTransaction({ actionSlug }: { actionSlug: string }) {
  const transaction = useRpcQuery('invoke_transaction', {
    slug: actionSlug,
  })

  if (!transaction.data) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>
        {actionSlug} #{transaction.data.transactionId}
      </h1>
      {transaction.data.transactionId && (
        <Transaction id={transaction.data.transactionId} />
      )}
    </div>
  )
}

export default function Action() {
  const { actionSlug } = useParams()

  if (!actionSlug) {
    return <div>No action slug</div>
  }

  return <StartTransaction actionSlug={actionSlug} />
}
