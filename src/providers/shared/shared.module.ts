
import { NgModule, ModuleWithProviders } from '@angular/core';

// Services
import { WebSocket } from './websocket/websocket.provider';
import { UsersStatus } from './user_status/user_status.provider';
import { SoundsManager } from './sounds/sounds.provider';
import { ModalService } from './modal/modal.provider';

// Components
import { ModalComponent } from './modal/modal.component';

// Directives
import { UserStatusDirective } from './user_status/user_status.directive';
import { ModalDirective } from './modal/modal.directive';
import { NetworkStatusDirective } from './networkStatus/networkStatus.directive';

@NgModule({
    declarations:[
        UserStatusDirective,
        ModalDirective,
        ModalComponent,
        NetworkStatusDirective
    ],
    exports:[
        UserStatusDirective,
        ModalDirective,
        ModalComponent,
        NetworkStatusDirective
    ]
})
export class SharedModule {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: SharedModule,
            providers: [
                WebSocket,
                UsersStatus,
                SoundsManager,
                ModalService
            ]
        }
    }
}

export {
    WebSocket,
    UsersStatus,
    SoundsManager,
    ModalService,
    ModalComponent,
    NetworkStatusDirective
};
