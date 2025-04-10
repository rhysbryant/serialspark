## Serial/UART Interfacing Tool ##
Web application that runs on an ESP32 accessed over WIFI - alternative to USB serial converters.

Works in mobile and desktop browsers.

#### features ####

* terminal
* send/view data in hex and or other formats
* upload firmware to an STM32 over a UART connection
* secure supports TLS and user authentication


## Why ##

I had an idea, I could replace use of USB UART adaptors with an ESP32 running a web interface with the common tools
I use such as crafting packets in hex to manually test protocols, uploading firmware to STM32 chips and sometimes a serial terminal. I had some projects where getting a laptop to the device after deployment for debugging / firmware updating was not that covenant.

## Tech used / Design  ##

![Terminal Tab](serialSpart_term.PNG)
![Upload Tab](serialSpart_upload.PNG)
![Display Tab](serialSpart_display.PNG)

Backend based on platform IO with ESP idf.
HTTP Server is one I created for a different project and ported to RTOS the latency was round x3 lower then the HTTP Server in the ESP SDK.
frontend based on preactjs the terminal render is xtermjs.


The idea was to keep the server side lightweight and do all the heavy lifting (protocol specific encode/decode) client side.
So the tool could by easily extended later by allowing internally stored externally hosted and plugins to be loaded dynamically. this only adds a relatively small amount of latency.

### Setup ###

Has been tested on a esp-wroom-32 and esp32-c3 super mini dev boards

### desired features / TODO ###

* ESP firmware upload support
* support for controlling DTR and RTS
* UI Plugin support
* Host for USB Serial devices -
  it appears some ESP32 chips can support being a Host for USB serial devices. there is drivers and examples, so
  it would be neat to have that as a feature.

 Have a different idea or want to help? pull requests are welcome.


## building ##

### First Run ###

By default the network broadcast by the ESP is open. Connect to this network. 
go to the IP address (generally 192.168.4.1) of the ESP and on the settings tab update the security for the virtual access point. To join to a network on this tab update the 'Client' details.

To enable https upload a self signed or CA signed public/private using a secure wifi network.
see settings tab

### Web UI ###
 
 within webui directory

 * install dependencies with `npm install`
 * to build `npm run build` 
  this will package the webUI files into a header file called `webui_files.h` this file is then included in the backend build
 * local testing `npm run dev`

### Device Firmware
   `platformio run --environment esp32`