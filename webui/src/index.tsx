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
import LoginTab from './tabs/loginTab';
import { Auth, GetTokenResponse } from './lib/settingsAPI';

interface TabDef {
	tab: any,
	title: string,
	aSyncData: boolean
}

interface AppState {
	serialClient: SerialClient
	activeTabIndex: number
	lastActiveTabIndex: number
	serverStatus: string
	portStatus: string
	operationStatus: string
	authToken?: string
	tabs: TabDef[]
	loginError?: string
}

export class App extends Component<{}, AppState> {
	#client: SerialClient
	#builtInTabs: any
	#tabs: TabDef[] = [];
	#tabASyncDataCallback: ((buffer: ArrayBuffer) => void)[] = {};

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

	#getTabs(auth: Auth) {

		let tabs = new Array<TabDef>()

		tabs.push({
			tab: <PortTab auth={auth} postStatusUpdate={this.#postStatusUpdate.bind(this)} serialClient={this.state.serialClient} />,
			title: "Port",
			aSyncData: false
		});
		tabs.push({
			tab: <TermTab auth={auth} dataUpdateFunc={(f) => this.#setAsyncDataHandler("Terminal", f)} postStatusUpdate={this.#postStatusUpdate.bind(this)} serialClient={this.state.serialClient} />,
			title: "Terminal",
			aSyncData: true
		});
		tabs.push({
			tab: <UploadTab auth={auth} postStatusUpdate={this.#postStatusUpdate.bind(this)} serialClient={this.state.serialClient} />,
			title: "Upload",
			aSyncData: false
		});
		tabs.push({
			tab: <DisplayTab auth={auth} dataUpdateFunc={(f) => this.#setAsyncDataHandler("Display", f)} postStatusUpdate={this.#postStatusUpdate.bind(this)} serialClient={this.state.serialClient} />,
			title: "Display",
			aSyncData: true
		});
		tabs.push({
			tab: <SettingsTab auth={auth} postStatusUpdate={this.#postStatusUpdate.bind(this)} serialClient={this.state.serialClient} />,
			title: "Settings",
			aSyncData: false
		});

		return tabs;
	}

	#getLogInTab(errorMessage: string) {
		let tabs = new Array<TabDef>()
		tabs.push({
			tab: <LoginTab errorMessage={errorMessage} loginClick={this.#onLoginClick.bind(this)} />,
			title: "Login",
			aSyncData: false,
		})
		return tabs;
	}

	constructor(props) {
		super(props);
		this.state = {
			serialClient: null,
			activeTabIndex: 0,
			lastActiveTabIndex: 0,
			serverStatus: "Connecting",
			portStatus: "Closed",
			operationStatus: "None",
			tabs: this.#getLogInTab('')
		};

	}

	#socketEventsSetup(client: SerialClient) {
		client.onConnected(() => {
			this.setState({ serverStatus: "Connected" });
			client.onAsyncData(this.#onAsyncData.bind(this));
		})

		client.onSocketClose = (message) => {
			this.setState({ serverStatus: "Connection closed," + message, portStatus: "Closed" });
		}

		client.onSocketError = (message) => {
			this.setState({ serverStatus: "Connection lost," + message, portStatus: "Closed" });
		};
	}

	#setAsyncDataHandler(tabName: string, callback: (buffer: ArrayBuffer) => void) {
		this.#tabASyncDataCallback[tabName] = callback;
	}

	#getTokenResponse(response: GetTokenResponse, inital: boolean) {
		const wsURL = (location.protocol == "https:" ? "wss://" : "ws://") + location.host + "/ws";

		if (response.sucsess) {
			const sc = new SerialClient(wsURL, response.token);
			this.#socketEventsSetup(sc);
			this.setState({
				authToken: response.token,
				serialClient: sc,
			}, () => {
				this.setState({
					tabs: this.#getTabs(new Auth(response.token))
				})
			})

		} else if (!inital) {
			this.setState({
				tabs: this.#getLogInTab('invalid username or password')
			});
		}
	}

	componentDidMount(): void {
		//initally try with no creds to test if auth is enabled
		Auth.getToken().then(r => this.#getTokenResponse(r, true))
	}

	#onAsyncData(buffer: ArrayBuffer) {
		const aSyncDataCallback = this.#tabASyncDataCallback[this.state.tabs[this.state.activeTabIndex].title];
		if (aSyncDataCallback != undefined) {
			aSyncDataCallback(buffer);
		}
	}

	#onTabChange(index: number) {
		const { tabs } = this.state;

		if (tabs[index].aSyncData != tabs[this.state.activeTabIndex].aSyncData) {
			if (!tabs[index].aSyncData) {
				this.state.serialClient.stopAsyncRead()
			} else {
				this.state.serialClient.startAsyncRead()
			}
		}
		this.setState({ 'activeTabIndex': index, lastActiveTabIndex: this.state.activeTabIndex });
	}

	#onLoginClick(user: string, password: string) {
		Auth.getToken({ user, password })
			.then(r => this.#getTokenResponse(r, false))
			.catch(e => this.setState({ tabs: this.#getLogInTab(e) }))
	}

	render() {
		const { state } = this;
		let tabs = state.tabs;


		return <div>
			<div id="tabs">
				{tabs.map((item, index) => <Tab isSelected={index == state.activeTabIndex}
					text={item.title} onClick={() => this.#onTabChange(index)} />)}
			</div>
			<div id="container">
				{tabs.map((item, index) => <TabContainer isActive={index == state.activeTabIndex}>
					{item.tab}
				</TabContainer>)}
			</div>
			{this.state.tabs.length > 1 ?
				<StatusBar serverStatus={state.serverStatus} portStatus={state.portStatus} operationStatus={state.operationStatus} />
				: null}
		</div>
	}
}

render(<App />, document.getElementById('app'));
