import { Injectable } from '@angular/core';
import { AbstractModel } from './abstract_model';
import { Api } from '../services/api.provider';

@Injectable()
export class ConversationModel extends AbstractModel {

    public _method_get: string = 'conversation.get';

    public cache_model_prefix: string = 'cvn.';
    public cache_list_name: string = 'cvn.ids';

    constructor(  public api: Api ){
        super( api  );
    }
}
