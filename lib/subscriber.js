import {
  RabbitConnectorBase,
  Receiver
} from '@hoist/broker';
import errors from '@hoist/errors';

export class Subscriber extends RabbitConnectorBase {
  constructor() {
    super();
    this._receiver = new Receiver();
  }
  listen({
    eventName,
    correlationId,
    applicationId
  }) {
    let commandQueue = `${applicationId}-await-${eventName}-${correlationId}`
    return this._openChannel()
      .then((channel) => {
        return Promise.all([
            channel.assertQueue(commandQueue, {
              exclusive: true,
              autoDelete: true
            }),
            channel.assertExchange('hoist', 'topic')
          ]).then(() => {
            return Promise.all([
              channel.bindQueue(commandQueue, 'hoist', `event.${applicationId}.${eventName}:completed.${correlationId}`),
              channel.bindQueue(commandQueue, 'hoist', `event.${applicationId}.error.${correlationId}`)
            ]);
          }).then(() => {
            return new Promise((resolve, reject) => {
              channel.consume(commandQueue, (message) => {
                console.log(message.content.toString());
                this._receiver.restore(JSON.parse(message.content.toString()))
                  .then((msg) => {
                    resolve(msg);
                  });
              });
            });
          }).then((result) => {
            this._logger.info('closing channel');
            return channel.close().then(() => {
              return result;
            })
          })
          .catch((err) => {
            this._logger.error(err);
            this._logger.info('closing channel');
            return channel.close().then(() => {
              throw err;
            });
          });
      });


  }
}
