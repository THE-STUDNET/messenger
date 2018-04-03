
import { NgModule, ModuleWithProviders } from '@angular/core';

// Services
import { WebSocket } from './websocket/websocket.provider';
import { UsersStatus } from './user_status/user_status.provider';
import { SoundsManager } from './sounds/sounds.provider';
import { ModalService } from './modal/modal.provider';
import { FileCache } from './filecache/filecache.provider';
import { Upload } from './upload/upload.provider';

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
                ModalService,
                FileCache,
                Upload
            ]
        }
    }
}

export {
    FileCache,
    WebSocket,
    UsersStatus,
    SoundsManager,
    ModalService,
    Upload,
    ModalComponent,
    NetworkStatusDirective
};
