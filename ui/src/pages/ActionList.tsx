import { Link } from 'react-router-dom'
import { useRpcQuery } from '../rpcClient'

export default function ActionList() {
  const actions = useRpcQuery('list_available_actions', {})
  const transactions = useRpcQuery('list_transactions', {})
  if (!actions.data) return null
  if (!transactions.data) return null
  return (
    <div>
      <div>
        <h1 className="text-lg">Actions:</h1>
        <ul>
          {actions.data.map(a => (
            <li key={a.slug}>
              <Link to={`/actions/${a.slug}`}>{a.slug}</Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h1 className="text-lg">Open transactions:</h1>
        {transactions.data.length === 0 && (
          <p className="italic">No open transactions</p>
        )}
        <ul>
          {transactions.data.map(a => (
            <li key={a.transactionId}>
              #{a.transactionId} {a.actionSlug}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
