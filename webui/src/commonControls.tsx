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
import { ComponentChildren } from "preact";

interface DropDownProps {
    label: string
    items: string[]
    selectedIndex?: number
    //select item by it's text
    selectedItem?: string
    enabled?: boolean
    //other controls to put on the same row
    children?: ComponentChildren
    onChange: (value: string) => void
}

export function DropDown({ label, enabled, items, onChange, children }: DropDownProps) {
    return (<div>
        <label>{label}</label>
        <select onChange={(event) => onChange((event.target as any).value)}  {...((!(this.props.enabled == undefined || enabled)) && { disabled: true })} >
            {items?.map((item, index) => <option {...((index == this.state?.selectedIndex || item == this.props.selectedItem) && { selected: true })} >{item}</option>)}
        </select>
        {children}
    </div>)
}

interface CheckBoxProps {
    label: string
    value?: string
    enabled?: boolean
    //other controls to put on the same row
    children?: ComponentChildren
    onChange: (elm: HTMLInputElement) => void
    checked?: boolean
}

export function CheckBox({ label, value, checked = false, enabled = true, children, onChange }: CheckBoxProps) {
    return (<div>
        <label >{label}</label>
        <input {...(checked && { checked: true })} {...(!enabled && { disabled: true })} type="checkbox" value={value}
            onChange={(event) => onChange(event.target as HTMLInputElement)} />
        {children}
    </div>)
}

interface TextInputProps {
    label: string
    value?: string
    enabled?: boolean
    //other controls to put on the same row
    children?: ComponentChildren
    onChange: (elm: HTMLInputElement) => void
    type?: string
    valueList?: string[]
    size: number
    inputRef?: (elm: HTMLInputElement) => void

}

export function TextInput({ label, type = "text", valueList = [], size = 30, inputRef, value, children, onChange }: TextInputProps) {

    const ID = label.replace(" ", "_") + (Math.random() * 100)
    const hasList = valueList.length > 0;;
    return (<div>
        <label for={"i" + ID} >{label}</label>
        <input type={type} value={value}
            onChange={(event) => onChange(event.target as HTMLInputElement)}
            {...(hasList && { list: "dl" + ID })}
            size={size}
            ref={inputRef}
            id={"i" + ID}
        />
        {
            hasList ? <datalist id={"dl" + ID} >{valueList.map(v => <option>{v}</option>)}</datalist> : null
        }
        {children}
    </div>)
}
