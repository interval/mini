import { useRpcQuery } from '../rpcClient'

export default function ActionList() {
  const actions = useRpcQuery('list_available_actions', {})
  if (!actions.data) return null
  return (
    <h1 className="text-lg">
      Actions:
      {actions.data.map(a => (
        <li key={a.slug}>{a.slug}</li>
      ))}
    </h1>
  )
}
