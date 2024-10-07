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
import { Component, render } from 'preact';
import { Tab, TabContainer } from './tab'

import { PortTab } from './tabs/portTab';
import { SerialClient } from './lib/serialClient';
import './style.css';
import UploadTab from './tabs/uploadTab';
import TermTab from './tabs/termTab';
import DisplayTab from './tabs/displayTab';
import StatusBar from './statusBar';
import SettingsTab from './tabs/settingsTab';

interface AppState {
	serialClient: SerialClient
	activeTabIndex: number
	lastActiveTabIndex: number
	serverStatus: string
	portStatus: string
	operationStatus: string
}

interface TabDef {
	tab: any,
	title: string,
	aSyncData: boolean
}

export class App extends Component<{}, AppState> {
	#client: SerialClient
	#builtInTabs: any
	#tabs: TabDef[]=[];
	#tabASyncDataCallback: ((buffer: ArrayBuffer) => void)[]={};

	#postStatusUpdate(type: string, message: string) {
		switch (type) {
			case 'server':
				this.setState({ serverStatus: message });
				break;
			case 'port':
				this.setState({ portStatus: message.toString() });
				break;
			case 'operation':
				this.setState({ operationStatus: message });
				break;
		}
	}

	constructor(props) {
		super(props);
		this.state = {
			serialClient: new SerialClient((location.protocol == "https:" ? "wss://" : "ws://") + location.host + "/ws"),
			activeTabIndex: 0,
			lastActiveTabIndex: 0,
			serverStatus: "Connecting",
			portStatus: "Closed",
			operationStatus: "None"
		};

		this.state.serialClient.onConnected(() => {
			this.setState({ serverStatus: "Connected" });
			this.state.serialClient.onAsyncData(this.#onAsyncData.bind(this));
		})

		this.state.serialClient.onSocketClose = (message) => {
			this.setState({ serverStatus: "Connection closed," + message, portStatus: "Closed" });
		}

		this.state.serialClient.onSocketError = (message) => {
			this.setState({ serverStatus: "Connection lost," + message, portStatus: "Closed" });
		};

		let tabs: TabDef[]=this.#tabs;

		tabs.push({
			tab: <PortTab postStatusUpdate={this.#postStatusUpdate.bind(this)} serialClient={this.state.serialClient} />,
			title: "Port",
			aSyncData: false
		});
		tabs.push({
			tab: <TermTab dataUpdateFunc={(f) => this.#setAsyncDataHandler("Terminal", f)} postStatusUpdate={this.#postStatusUpdate.bind(this)} serialClient={this.state.serialClient} />,
			title: "Terminal",
			aSyncData: true
		});
		tabs.push({
			tab: <UploadTab postStatusUpdate={this.#postStatusUpdate.bind(this)} serialClient={this.state.serialClient} />,
			title: "Upload",
			aSyncData: false
		});
		tabs.push({
			tab: <DisplayTab dataUpdateFunc={(f) => this.#setAsyncDataHandler("Display", f)} postStatusUpdate={this.#postStatusUpdate.bind(this)} serialClient={this.state.serialClient} />,
			title: "Display",
			aSyncData: true
		});
		tabs.push({
			tab: <SettingsTab postStatusUpdate={this.#postStatusUpdate.bind(this)} serialClient={this.state.serialClient} />,
			title: "Settings",
			aSyncData: false
		});

	}

	#setAsyncDataHandler(tabName: string, callback: (buffer: ArrayBuffer) => void) {
		this.#tabASyncDataCallback[tabName] = callback;
	}

	componentDidMount(): void {
		
	}

	#onAsyncData(buffer: ArrayBuffer) {
		const aSyncDataCallback = this.#tabASyncDataCallback[this.#tabs[this.state.activeTabIndex].title];
		if (aSyncDataCallback != undefined ) {
			aSyncDataCallback(buffer);
		}
	}

	#onTabChange(index: number) {

		if (this.#tabs[index].aSyncData != this.#tabs[this.state.activeTabIndex].aSyncData) {
			if (!this.#tabs[index].aSyncData) {
				this.state.serialClient.stopAsyncRead()
			} else {
				this.state.serialClient.startAsyncRead()
			}
		}
		this.setState({ 'activeTabIndex': index, lastActiveTabIndex: this.state.activeTabIndex });
	}

	render() {
		const { state } = this;

		return <div>
			<div id="tabs">
				{this.#tabs.map((item, index) => <Tab isSelected={index == state.activeTabIndex}
					text={item.title} onClick={() => this.#onTabChange(index)} />)}
			</div>
			<div id="container">
				{this.#tabs.map((item, index) => <TabContainer isActive={index == state.activeTabIndex}>
					{item.tab}
				</TabContainer>)}
			</div>
			<StatusBar serverStatus={state.serverStatus} portStatus={state.portStatus} operationStatus={state.operationStatus} />
		</div>
	}
}

render(<App />, document.getElementById('app'));
