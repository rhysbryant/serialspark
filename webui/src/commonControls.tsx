/*
 Copyright (c) 2024 Rhys Bryant

 serialspark is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 serialspark is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with serialspark. If not, see <https://www.gnu.org/licenses/>.
 */
import { Component, ComponentChildren } from "preact";

//base for any form input i.e select and input tags
interface InputBaseProps {
    label: string
    enabled?: boolean
    //other controls to put on the same row
    children?: ComponentChildren
    inline?: boolean
    title?: string
}

const inlineAttr = {
    style: {
        display: 'inline'
    }
}

interface DropDownProps extends InputBaseProps {
    items: string[]
    selectedIndex?: number
    //select item by it's text
    selectedItem?: string
    onChange: (elm: HTMLSelectElement) => void
}

export function DropDown({ label, enabled, items, onChange, children, inline }: DropDownProps) {
    return (<div {...(inline && { ...inlineAttr })} >
        <label>{label}</label>
        <select onChange={(event) => onChange((event.target as any))}  {...((!(this.props.enabled == undefined || enabled)) && { disabled: true })} >
            {items?.map((item, index) => <option {...((index == this.state?.selectedIndex || item == this.props.selectedItem) && { selected: true })} >{item}</option>)}
        </select>
        {children}
    </div>)
}

//base for form input element
interface BaseInputProps extends InputBaseProps {
    type?: string
    value?: string
    onChange?: (elm: HTMLInputElement) => void
    inputRef?: (elm: HTMLInputElement) => void
    id?: string
    extra?: {}
    hasError?: boolean
}

function BaseInput({ label, type, value, inputRef, enabled = true, children, onChange, inline, title, id,hasError = false, extra }: BaseInputProps) {

    const ID = id ?? label.replace(" ", "_") + (Math.random() * 100);
    return (<div {...(inline && { ...inlineAttr })}>
        <label for={"i" + ID} >{label}</label>
        <input {...(hasError && { className: "input-error" })} title={title} type={type} value={value}
            {...(!enabled && { disabled: true })}
            onChange={(event) => onChange && onChange(event.target as HTMLInputElement)}
            {...(extra)}
            ref={inputRef}
            id={"i" + ID}
        />
        {children}
    </div>)
}

interface CheckBoxProps extends InputBaseProps {
    value?: string
    onChange: (elm: HTMLInputElement) => void
    checked?: boolean
}

export function CheckBox(props: CheckBoxProps) {
    const extra = { ...(props?.checked && { checked: true }) }

    return <BaseInput type="checkbox" extra={extra} {...props} />
}

interface TextInputProps extends InputBaseProps {
    value?: string
    onChange?: (elm: HTMLInputElement) => void
    type?: string
    valueList?: string[]
    size?: number
    hasError?: boolean
    inputRef?: (elm: HTMLInputElement) => void

}

export function TextInput(props: TextInputProps) {

    const { valueList, size, value, label, children } = props;
    const id = label.replace(" ", "_") + (Math.random() * 100)
    const hasList = valueList?.length > 0;
    const extra = { size, value, id, ...(hasList && { list: "dl" + id }) }

    return (<BaseInput {...props} extra={extra} >
        {
            hasList ? <datalist id={"dl" + id} >{props.valueList.map(v => <option>{v}</option>)}</datalist> : null
        }
        {children}
    </BaseInput>)
}

interface FileInputProps extends InputBaseProps {
    onChange: (elm: HTMLInputElement) => void
}

export function FileInput(props: FileInputProps) {
    return <BaseInput type="file" {...props} />
}

interface ButtonProps extends InputBaseProps {
    onClick: (elm: HTMLButtonElement) => void
}

export function Button({ label, enabled = true, onClick, inline }: ButtonProps) {
    return <div {...(inline && { ...inlineAttr })} >
        <button {...(!enabled && { disabled: true })} onClick={(e) => onClick(e.target as HTMLButtonElement)}>{label}</button>
    </div>
}

interface FormControlsProps {
    children?: ComponentChildren
}

export function FormControls({ children }: FormControlsProps) {
    return <div class="form-v">{children}</div>
}
