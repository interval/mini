import { useParams } from 'react-router-dom'
import { useRpcQuery } from '../rpcClient'
import { useEffect, useMemo, useState } from 'react'
import { TransactionState } from '../../../sdk/src/transactionStateSchema'

function useListenToTransactionState(id: number) {
  const [data, setData] = useState<TransactionState | null>(null)
  useEffect(() => {
    // First, we need to create an instance of EventSource and pass the data stream URL as a
    // parameter in its constructor
    const es = new EventSource(`/api/events/${id}`)
    // Whenever the connection is established between the server and the client we'll get notified
    es.onopen = () => console.log('>>> Connection opened!')
    // Made a mistake, or something bad happened on the server? We get notified here
    es.onerror = e => console.log('ERROR!', e)
    // This is where we get the messages. The event is an object and we're interested in its `data` property
    es.onmessage = e => {
      setData(JSON.parse(e.data))
    }
    // Whenever we're done with the data stream we must close the connection
    return () => es.close()
  }, [id])
  return data
}

function useTransactionState(id: number) {
  const stateFromListener = useListenToTransactionState(id)
  const rpcQuery = useRpcQuery('get_transaction_state', {
    transactionId: id,
  })

  const stateFromRpc = rpcQuery.data

  const state = useMemo(() => {
    // choose the most recent state in a race between the listener and the rpc query
    if (stateFromListener && stateFromRpc) {
      if (stateFromListener.id > stateFromRpc.id) {
        return stateFromListener.value
      }
      return stateFromRpc.value
    }

    // order here doesn't matter because at least one of these is null
    if (stateFromListener) return stateFromListener.value
    if (stateFromRpc) return stateFromRpc.value
    return null
  }, [stateFromListener, stateFromRpc])

  return state
}

function Transaction({ id }: { id: number }) {
  const transactionState = useTransactionState(id)

  useEffect(() => {
    console.log('New transaction state:', transactionState)
  }, [transactionState])

  if (!transactionState) {
    return <div>Loading...</div>
  }

  return <pre>{JSON.stringify(transactionState, null, 2)}</pre>
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
      {<Transaction id={transaction.data.transactionId} />}
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
