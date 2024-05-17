
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
interface StatusBarProps {
    serverStatus: string
    portStatus: string
    operationStatus?: string
}

export default function StatusBar({ serverStatus, portStatus, operationStatus }: StatusBarProps) {

    return (<div id="status">
        <span>
            <span class="statusLabel">Server:</span>
            <span class="statusValue" >{serverStatus}</span>
        </span>
        <span>
            <span class="statusLabel">Port:</span>
            <span class="statusValue" >{portStatus}</span>
        </span>
        <span>
            <span class="statusLabel">Operation:</span>
            <span class="statusValue" >{operationStatus ?? "None"}</span>
        </span>
    </div>)
}