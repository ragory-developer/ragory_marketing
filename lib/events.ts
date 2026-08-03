import { EventEmitter } from 'events'

const eventEmitterSingleton = () => {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(100) // Allow multiple connected dashboard clients
  return emitter
}

declare const globalThis: {
  messageEmitterGlobal: ReturnType<typeof eventEmitterSingleton>;
} & typeof global;

const messageEmitter = globalThis.messageEmitterGlobal ?? eventEmitterSingleton()

export default messageEmitter

if (process.env.NODE_ENV !== 'production') globalThis.messageEmitterGlobal = messageEmitter
