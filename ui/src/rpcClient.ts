import { useQuery } from 'react-query'
import type { RpcTypes, RpcSchema } from '../../sdk/src/rpc'

export async function rpcClient<T extends keyof RpcSchema>(
  endpoint: T,
  params: RpcTypes<T>['params']
) {
  const resp = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(params),
  })
  const data = await resp.json()
  return data as RpcTypes<T>['returns']
}

export function useRpcQuery<T extends keyof RpcSchema>(
  endpoint: T,
  params: RpcTypes<T>['params']
) {
  const data = useQuery(endpoint, () => rpcClient(endpoint, params))

  return data
}
