import React, { useMemo, useState } from 'react'
// import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
// import { RCTResponderProps } from '~/components/RenderIOCall'
// import useInput from '~/utils/useInput'
import IVInputField from '~/components/IVInputField'
import { IOInputProps } from '~/RenderIOCall'
import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'

export default function InputText({
  props,
  context,
}: IOInputProps<'INPUT_TEXT'>) {
  const [state, setState] = useState('')
  //   const { errorMessage } = useInput(props)

  const {
    //onUpdatePendingReturnValue,
    minLength,
    maxLength,
  } = props

  const constraintDetails = useMemo(() => {
    if (minLength && maxLength) {
      return `between ${minLength} and ${maxLength} characters`
    } else if (minLength) {
      return `at least ${minLength} characters`
    } else if (maxLength) {
      return `at most ${maxLength} characters`
    }

    return undefined
  }, [minLength, maxLength])

  const constraints = useMemo(
    () => (constraintDetails ? `Must be ${constraintDetails}.` : undefined),
    [constraintDetails]
  )

  const DomElement = props.multiline ? 'textarea' : 'input'
  const isInput = !props.multiline

  return (
    <IVInputField
      label={props.label}
      id={context.id}
      helpText={props.helpText}
      optional={context.isOptional}
      //   errorMessage={errorMessage}
      constraints={constraints}
    >
      <DomElement
        className="form-input"
        data-autofocus-target={context.autoFocus ? true : undefined}
        type={isInput ? 'text' : undefined}
        autoCorrect={isInput ? 'off' : undefined}
        autoComplete={isInput ? 'off' : undefined}
        aria-autocomplete={isInput ? 'none' : undefined}
        onKeyDown={isInput ? preventDefaultInputEnterKey : undefined}
        rows={props.multiline ? props.lines || 3 : undefined}
        id={context.id}
        value={state}
        placeholder={context.isCurrentCall ? props.placeholder : undefined}
        disabled={props.disabled || context.isSubmitting}
        onChange={(e: any) => {
          const v = e.target.value
          setState(v)
          context.updatePendingReturnValue(v)
          // if (v.length > 0) {
          //   if (
          //     (minLength && v.length < minLength) ||
          //     (maxLength && v.length > maxLength)
          //   ) {
          //     onUpdatePendingReturnValue(
          //       new IOComponentError(
          //         `Please enter a value with ${constraintDetails}.`
          //       )
          //     )
          //   } else {
          //     onUpdatePendingReturnValue(v)
          //   }
          // } else if (isOptional) {
          //   onUpdatePendingReturnValue(undefined)
          // } else {
          //   onUpdatePendingReturnValue(new IOComponentError())
          // }
        }}
      />
    </IVInputField>
  )
}
