import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class ConversationModel extends AbstractModel {

    constructor(  public api: Api ){
        super( {
            cache_model_prefix: 'cvn.',
            cache_list_name: 'cvn.ids',
            _method_get: 'conversation.get',
        }, api );
    }

}
