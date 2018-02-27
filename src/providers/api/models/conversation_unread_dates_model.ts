import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class ConversationUnreadDateModel extends AbstractModel {

    constructor(  public api: Api ){
        super( {
            cache_size: 0,
            cache_model_prefix: 'cur.',
            cache_list_name: 'cur.ids',
            _method_get: 'conversation.getReadDates',
        }, api );
    }

}
