'use strict';
import logger from '@hoist/logger';
import errors from '@hoist/errors';
import {
  Authorization
} from './authorization';
import fs from 'fs';
import path from 'path';
import config from 'config';
import {
  BouncerToken,
  ConnectorSetting
} from '@hoist/model';
import {
  Publisher
} from '../broker';
import {
  isFunction
} from 'lodash';

export class ConnectorHandler {
  constructor() {
    this._logger = logger.child({
      cls: this.constructor.name
    });
    this._publisher = new Publisher();
  }
  _loadConnector(connectorSettings) {
    return Promise.resolve()
      .then(() => {
        var connectorPath = path.resolve(path.join(config.get('Hoist.filePaths.connectors'), connectorSettings.connectorType, 'current'));
        /*istanbul ignore if */
        if (!fs.existsSync(connectorPath)) {
          throw new errors.connector.InvalidError();
        }

        var realpath = fs.readlinkSync(connectorPath);
        logger.info({
          connectorPath: connectorPath,
          realpath: realpath
        }, 'connectorPath');
        return require(realpath);
      })
      .then((Connector) => {
        if (Connector.default && isFunction(Connector.default)) {
          Connector = Connector.default;
        }
        connectorSettings.settings._connectorKey = connectorSettings.key;
        connectorSettings.settings._applicationId = connectorSettings.application;
        return new Connector(connectorSettings.settings);
      });
  }
  onRequest(request, reply) {
    this._logger.info('starting connector request');
    return Promise.resolve()
      .then(() => {
        return BouncerToken.findOneAsync({
          key: request.params.connectorKey
        });
      }).then((bouncerToken) => {
        if (!bouncerToken) {
          throw new errors.Http404Error('invalid key');
        }
        return ConnectorSetting.findOneAsync({
          application: bouncerToken.application,
          environment: bouncerToken.environment,
          key: bouncerToken.connectorKey
        }).then((connectorSettings) => {
          if (!connectorSettings) {
            throw new errors.Http500Error('unable to find connector settings');
          }
          return this._loadConnector(connectorSettings);
        }).then((connector) => {
          if (!connector) {
            throw new errors.Http500Error('unable to load connector');
          }
          if (!connector.intercept) {
            return reply({
              ok: true
            });
          }
          return connector.intercept(new Authorization(request, reply, bouncerToken, this._publisher))
            .then(function () {
              return reply({
                ok: true
              });
            });
        });
      }).catch((err) => {
        this._logger.error(err);
        reply(err);
      });

  }
}
