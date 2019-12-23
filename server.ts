import IRouteShelf from './interfaces/IRouteShelf'
import RouteShelf from './routeShelf/route-shelf'
import Mocker from './mocker/mocker'
import CreateMockerHandler from './handlers/create-mocker-handler'
import { POST } from './consts/methods-consts'
import { range } from 'lodash'
import IMocker from './interfaces/IMocker'
import IConfig from './interfaces/IConfig'
import checkParamsConfig from './helpers/check-params-config'
import RequestShelf from './requestShelf/request-shelf'
import IRequestShelf from './interfaces/IRequestShelf'

let routeShelf: IRouteShelf = new RouteShelf()

export default function server (config: IConfig): Promise<IMocker> {
  return new Promise((resolve, reject) => {
    let host: string = config.host || '0.0.0.0'
    let port: string = config.serverPort || '4000'
    let rangeArray: string = config.mockersPortsRange || '5000-6000'
    if (config.host != undefined && config.serverPort != undefined && config.mockersPortsRange != undefined) {
      let err: string = checkParamsConfig(config)
      if (err) {
        return reject(err)
      }
    }
    let requestShelf: IRequestShelf = new RequestShelf()
    const [portInit, portLimit] = getPortsArray(rangeArray)
    const server = new Mocker(host, Number(port), routeShelf, requestShelf)
    server.loadServer()
    server.runServer().then((res) => {
      server.addRoute({
        filters: { path: '/create', method: POST },
        response: CreateMockerHandler.prototype.handle.bind(new CreateMockerHandler(host, range(Number(portInit), Number(portLimit), 1), requestShelf))
      })
      resolve(server)
    }).catch(reject)
  })
}

function getPortsArray (text: string): Array<string> {
  return text.split('-')
}

