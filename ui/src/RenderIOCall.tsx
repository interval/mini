import { useCallback, useRef, useState } from 'react'
import {
  type InputSchemas,
  type InputTypes,
  INPUT_SCHEMAS,
} from '../../sdk/src/ioSchema'
import InputText from './components/io-methods/InputText'
// import IVInputField from '~/components/IVInputField'
// import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'

type IOMethodToComponent = {
  [K in keyof InputSchemas]: (props: IOInputProps<K>) => React.ReactNode
}

const ComponentMap: IOMethodToComponent = {
  INPUT_TEXT: InputText,
  INPUT_NUMBER: () => null,
}

export type IOInputProps<K extends keyof InputSchemas> = {
  props: InputTypes<K>['props']
  context: {
    id: string
    isCurrentCall: boolean
    isSubmitting: boolean
    isOptional: boolean
    autoFocus: boolean
    updatePendingReturnValue: (value: InputTypes<K>['returns']) => void
  }
}

export function parseIOCall<T extends keyof InputSchemas>(ioCall: {
  methodName: T
  props: any
}) {
  const ioSchema = INPUT_SCHEMAS[ioCall.methodName]
  if (!ioSchema) {
    throw new Error(`IO method ${ioCall.methodName} not found`)
  }
  return {
    methodName: ioCall.methodName,
    props: ioCall.props as InputTypes<T>['props'],
  }
}

export function RenderIOCall({
  ioCall,
  onSubmit,
}: {
  ioCall: any
  onSubmit: (value: any) => void
}) {
  const parsedCall = parseIOCall(ioCall)
  const ComponentToRender = ComponentMap[parsedCall.methodName]

  const pendingReturnValue = useRef<any>(null)

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        console.log('submit', pendingReturnValue.current)
        onSubmit(pendingReturnValue.current)
      }}
    >
      <ComponentToRender
        props={parsedCall.props}
        context={{
          id: '1',
          isCurrentCall: true,
          isSubmitting: false,
          isOptional: false,
          autoFocus: true,
          updatePendingReturnValue: value => {
            console.log('updatePendingReturnValue', value)
            pendingReturnValue.current = value
          },
        }}
      />
      <button type="submit">Submit</button>
    </form>
  )
}
