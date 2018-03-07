import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class ConversationUnreadDateModel extends AbstractModel {

    public _method_get: string = 'conversation.getReadDates';

    public cache_model_prefix: string = 'cur.';
    public cache_list_name: string = 'cur.ids';
    public cache_size: number = 0;

    constructor(  public api: Api ){
        super( api );
    }
}
