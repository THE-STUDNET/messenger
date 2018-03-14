
import { NgModule, ModuleWithProviders } from '@angular/core';

// Models
import { ItemModel } from './models/item_model';
import { ConversationModel } from './models/conversation_model';
import { ConversationUnreadDateModel } from './models/conversation_unread_dates_model';
import { UserModel } from './models/user_model';
import { PageModel } from './models/page_model';
import { UGMModel } from './models/user_groups_membership_model';
import { UEMModel } from './models/user_events_membership_model';
import { UCMModel } from './models/user_courses_membership_model';

// Paginators
import { ConversationsPaginator } from './paginators/conversations_paginator';

// Services
import { Api } from './services/api.provider';
import { Garbage } from './services/garbage.provider';
import { Account } from './services/account.provider';
import { ConversationService } from './services/conversation.provider';
import { MessagesPaginatorProvider, MessagesPaginator } from './services/messages.provider';

import { LiveClassesService } from './services/liveclasses.provider';
import { NotificationService } from './services/notifications.provider';

@NgModule({})
export class ApiModule {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: ApiModule,
            providers: [
                // Models
                ItemModel,
                ConversationModel,
                ConversationUnreadDateModel,
                UserModel,
                PageModel,
                UEMModel,
                UGMModel,
                UCMModel,
                // Paginators
                ConversationsPaginator,
                // Services
                Account,
                Api,
                Garbage,
                MessagesPaginatorProvider,
                ConversationService,
                LiveClassesService,
                NotificationService
            ]
        }
    }
}

export {
    // Services
    Api,
    Garbage,
    Account,
    MessagesPaginatorProvider,
    ConversationService,
    LiveClassesService,
    NotificationService,
    // Models
    PageModel,
    ConversationModel,
    ConversationUnreadDateModel,
    ItemModel,
    UserModel,
    UEMModel,
    UGMModel,
    UCMModel,
    // Paginators
    ConversationsPaginator,
    MessagesPaginator
};
