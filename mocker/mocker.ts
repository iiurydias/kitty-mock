import IRouteShelf from '../interfaces/IRouteShelf'
import { createServer, IncomingMessage, Server, ServerResponse } from 'http'
import IRoute from '../interfaces/IRoute'
import getJsend from '../helpers/get-jsend'
import IResponse from '../interfaces/IResponse'
import IMocker from '../interfaces/IMocker'
import { performance } from 'perf_hooks'
import { KITTY } from '../consts/kitty'
import ErrnoException = NodeJS.ErrnoException

const chalk = require('chalk')

export default class Mocker implements IMocker {
  private routeShelf: IRouteShelf
  private port: string
  private server: Server
  private hostname: string

  constructor (hostname: string, port: string, routeShelf: IRouteShelf) {
    this.routeShelf = routeShelf
    this.port = port
    this.hostname = hostname
  }

  public loadServer (): void {
    this.server = createServer((req, res) => {
      let initialTime = performance.now()
     this.routeShelf.getItem(this.port, req.url, req.method).then(route => {
           route.handler.handle(req).then((resp: IResponse) => {
             this.respRequest(res, resp, req, initialTime)
           }).catch((resp: IResponse) => {
             this.respRequest(res, resp, req, initialTime)
           })
     }).catch((code)=>{
       this.respRequest(res, {
             code: code,
             jsend: getJsend(code, undefined, 'Not found')
           }, req, initialTime)
     })
    })
  }

  private respRequest (res: ServerResponse, resp: IResponse, req: IncomingMessage, initialTime: number): void {
    res.writeHead(resp.code, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(resp.jsend), () => {
      this.printLog(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''), resp.code, req.method, req.url, this.getExecutionTime(performance.now(), initialTime))
    })
  }

  public runServer (): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server.listen(Number(this.port), this.hostname, () => {
        resolve(`New mocker running at http://${this.hostname}:${this.port}/`)
      })
      this.server.on('error', (e: ErrnoException) => {
        if (e.code === 'EADDRINUSE') {
          reject('Address in use, retrying...')
        }
      })
    })
  }

  public addRoute (route: IRoute): void {
    console.log('New route added to mocker on port ' + this.port + ' | ' + ' '.repeat(7 - route.method.length) + route.method + ' ' + route.path)
    this.routeShelf.setItem(this.port, route)

  }

  public stopServer (): Promise<null> {
    console.log('Closing mocker on port ' + this.port)
    return new Promise((resolve, reject) => {
      this.server.close((error) => error ? reject(error) : resolve(null))
    })
  }

  public printLog (date: string, code: number, method: string, path: string, time: string): void {
    let repeatSpaceOnTimeExecution: number = 20 - time.length
    let repeatSpaceOnMethod: number = 7 - method.length
    switch (true) {
      case (code >= 500):
        console.log(`${KITTY} ${date} | ${chalk.bgRed.bold(`  ${code}  `)} | ${" ".repeat(repeatSpaceOnTimeExecution)}${time} ms | ${" ".repeat(repeatSpaceOnMethod)}${method}  ${path}`)
        return
      case (code >= 400 && code < 500):
        console.log(`${KITTY} ${date} | ${chalk.black.bgYellow.bold(`  ${code}  `)} | ${" ".repeat(repeatSpaceOnTimeExecution)}${time} ms | ${" ".repeat(repeatSpaceOnMethod)}${method}  ${path}`)
        return
      default:
        console.log(`${KITTY} ${date} | ${chalk.bgGreen.bold(`  ${code}  `)} | ${" ".repeat(repeatSpaceOnTimeExecution)}${time} ms | ${" ".repeat(repeatSpaceOnMethod)}${method}  ${path}`)
    }
  }

  public getExecutionTime (t1: number, t0: number): string {
    return (t1 - t0).toString()
  }

}