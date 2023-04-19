import EventEmitter from "./event-emitter.js";

const DeviceProfiles = [

	/* Zjiang ZJ-5805 */
	{
		filters: [
			{ vendorId: 0x0416, productId: 0x5011 },
		],
		
		configuration:		1,
		interface:			0,
		endpoint:			3,

		language:			'esc-pos',
		codepageMapping:	'zjiang'
	},
			
	/* Samsung SRP */
	{
		filters: [
			{ vendorId: 0x0419 }
		],
		
		configuration:		1,
		interface:			0,
		endpoint:			1,

		language:			'esc-pos',
		codepageMapping:	'bixolon'
	},
			
	/* Star */
	{
		filters: [
			{ vendorId: 0x0519 }
		],
		
		configuration:		1,
		interface:			0,
		
		language:			'star-prnt',
		codepageMapping:	'star'
	},

	/* Epson */
	{
		filters: [
			{ vendorId: 0x04b8 },
		],
		
		configuration:		1,
		interface:			0,
		endpoint:			1,

		language:			'esc-pos',
		codepageMapping:	'epson'
	},

	/* Citizen */
	{
		filters: [
			{ vendorId: 0x1d90 },
		],
		
		configuration:		1,
		interface:			0,
		endpoint:			2,

		language:			'esc-pos',
		codepageMapping:	'citizen'
	},
			
	/* Dtronic */
	{
		filters: [
			{ vendorId: 0x0fe6, productId: 0x811e },
		],
		
		configuration:		1,
		interface:			0,
		endpoint:			2,

		language:			'esc-pos',
		codepageMapping:	'epson'
	}
]


class WebUSBReceiptPrinter {

	constructor() {
        this._internal = {
            emitter:    new EventEmitter(),
            device:     null,
			profile:	null
        }
	}

	async connect() {
		try {
			let device = await navigator.usb.requestDevice({ 
				filters: DeviceProfiles.map(i => i.filters).reduce((a, b) => a.concat(b))
			});
			
			if (device) {
				await this.open(device);
			}
		}
		catch(error) {
			console.log('Could not connect! ' + error);
		}
	}

	async reconnect(previousDevice) {
		let devices = await navigator.usb.getDevices();
		
		let device = devices.find(device => device.serialNumber == previousDevice.serialNumber);

		if (!device) {
			device = devices.find(device => device.vendorId == previousDevice.vendorId && device.productId == previousDevice.productId);
		}

		if (device) {
			await this.open(device);
		}
	}

	async open(device) {
		this._internal.device = device;

		this._internal.profile = DeviceProfiles.filter(
			item => item.filters.filter(
				filter => filter.vendorId && filter.productId ? filter.vendorId == this._internal.device.vendorId && filter.productId == this._internal.device.productId : filter.vendorId == this._internal.device.vendorId
			).length
		).pop();

		await this._internal.device.open();
		await this._internal.device.selectConfiguration(this._internal.profile.configuration);
		await this._internal.device.claimInterface(this._internal.profile.interface);
		
		this._internal.emitter.emit('connected', {
			manufacturerName: 	this._internal.device.manufacturerName,
			productName: 		this._internal.device.productName,
			serialNumber: 		this._internal.device.serialNumber,
			vendorId: 			this._internal.device.vendorId,
			productId: 			this._internal.device.productId,			
			language: 			this._internal.profile.language,
			codepageMapping:	this._internal.profile.codepageMapping
		});
	}
	
	async print(command) {
		let endpoint = this._internal.profile.endpoint;
		
		if (!endpoint) {
			let i = this._internal.device.configuration.interfaces.find(i => i.interfaceNumber == this._internal.profile.interface);
			let e = i.alternate.endpoints.find(e => e.direction == 'out');

			if (e) {
				endpoint = e.endpointNumber;
			}
		}

		if (endpoint) {
			try {
				await this._internal.device.transferOut(endpoint, command);
			}
			catch(e) {
				console.log(e);
			}
		}
	}

	addEventListener(n, f) {
		this._internal.emitter.on(n, f);
	}
}


export default WebUSBReceiptPrinter;