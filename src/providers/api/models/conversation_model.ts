import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { AbstractModel } from './abstract_model';
import { Api } from '../services/api.provider';
import { Garbage } from '../services/garbage.provider';
import { _getDeferred } from '../../../functions/getDeferred';

@Injectable()
export class ConversationModel extends AbstractModel {

    public _method_get: string = 'conversation.get';

    public cache_model_prefix: string = 'cvn.';
    public cache_list_name: string = 'cvn.ids';

    constructor(  public api: Api, public storage:Storage, public garbage:Garbage ){
        super( api, storage, garbage );
    }
}
