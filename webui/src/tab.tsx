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
import { ComponentChildren } from "preact"

interface TabProps {
    text: string
    isSelected: boolean
    onClick: () => void
}

export function Tab({ text, onClick, isSelected }: TabProps) {

    return <div onClick={onClick} class={isSelected ? "tab tabSelected" : "tab"}>{text}<div></div></div>
}

interface TabContainerProps {
    isActive: boolean
    children?: ComponentChildren
}

export function TabContainer({ children, isActive }: TabContainerProps) {

    return <div style={isActive ? { display: "block" } : { display: "none" }}>
        {children}
    </div>
}