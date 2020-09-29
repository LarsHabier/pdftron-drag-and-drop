import {Component, ViewChild, OnInit, ElementRef, AfterViewInit, Output, EventEmitter} from '@angular/core';
import WebViewer, {WebViewerInstance} from '@pdftron/webviewer';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('viewer', { static: false }) viewer: ElementRef;
  @Output() draggedEntity$ = new EventEmitter<string>();
  wvInstance: any;
  /**
   * The id of the dragElement
   */
  private readonly dragElementId = 'dragElement';
  /**
   * The current mouse position. Needed for the drag element position to synchronize with the mouse position.
   */
  private mousePosition = { x: 0, y: 0 };
  /**
   * The current selected Entity
   */
  private selectedEntity: any;
  /**
   * The div element which gets created when an user clicks on an annotation. Displays the annotation content.
   */
  private dragElement: HTMLDivElement;
  /**
   * Determine if the user is currently dragging.
   */
  private isDragging = false;

  ngAfterViewInit(): void {

    WebViewer({
      path: '../lib',
      initialDoc: '../files/webviewer-demo-annotated.pdf',
      config: '../assets/web-viewer-config.js',
      css: '../assets/web-viewer.css'
    }, this.viewer.nativeElement).then(instance => {
      this.wvInstance = instance;

      // now you can access APIs through this.webviewer.getInstance()
      instance.openElements(['notesPanel']);
      // see https://www.pdftron.com/documentation/web/guides/ui/apis for the full list of APIs

      // or listen to events from the viewer element
      this.viewer.nativeElement.addEventListener('pageChanged', (e) => {
        const [ pageNumber ] = e.detail;
        console.log(`Current page is ${pageNumber}`);
      });

      // or from the docViewer instance
      instance.docViewer.on('annotationsLoaded', () => {
        console.log('annotations loaded');
      });

      instance.docViewer.on('documentLoaded', this.wvDocumentLoadedHandler);
      this.initDragAndDrop(instance);
    });
  }

  ngOnInit() {
    this.wvDocumentLoadedHandler = this.wvDocumentLoadedHandler.bind(this);
  }

  wvDocumentLoadedHandler(): void {
    // you can access docViewer object for low-level APIs
    const docViewer = this.wvInstance;
    const annotManager = this.wvInstance.annotManager;
    // and access classes defined in the WebViewer iframe
    const { Annotations } = this.wvInstance;
    const rectangle = new Annotations.RectangleAnnotation();
    rectangle.PageNumber = 1;
    rectangle.X = 100;
    rectangle.Y = 100;
    rectangle.Width = 250;
    rectangle.Height = 250;
    rectangle.StrokeThickness = 5;
    rectangle.Author = annotManager.getCurrentUser();
    annotManager.addAnnotation(rectangle);
    annotManager.drawAnnotations(rectangle.PageNumber);
    // see https://www.pdftron.com/api/web/WebViewer.html for the full list of low-level APIs
  }
  private initDragAndDrop(instance: WebViewerInstance): void {
    const { docViewer } = instance;
    /**
     * Register an event handler for the mouse move event on the pdf viewer
     */
    docViewer.on('mouseMove', (event: MouseEvent) => {
      /**
       * Everytime the user is currently not dragging an entity we try to determine if the mouse cursor is currently
       * hovering an entity. If the mouse cursor is hovering an entity we disable the text select functionality which is
       * needed because the user should not be able to select text and drag an entity at the same time
       */
      if (!this.isDragging) {
        const isHoveringEntity = docViewer.getAnnotationManager().getAnnotationByMouseEvent(event);
        if (isHoveringEntity) {
          // Does not work in left mouse down event listener
          instance.disableFeatures([instance.Feature.TextSelection]);
          // Does not work either
          // window.Tools.Tool.ENABLE_TEXT_SELECTION = false;
          // instance.disableElements(['annotationContentOverlay']);
        }
      }
      /**
       * Save the current mouse position
       */
      this.mousePosition = { x: event.x, y: event.y };
      if (this.dragElement) {
        this.dragElement.style.left = `${this.mousePosition.x + 10}px`;
        this.dragElement.style.top = `${this.mousePosition.y + 80}px`;
      }
    });
    /**
     * Register an event handler for the mouse left down event on the pdf viewer
     */
    instance.docViewer.on('mouseLeftDown', (event: MouseEvent) => {
      /**
       * Destroy the current drag Element if it somehow still exists
       */
      this.destroyDragElement();
      /**
       * Get the current annotation, if the mouse is hovering one
       */
      this.selectedEntity = docViewer.getAnnotationManager().getAnnotationByMouseEvent(event);
      if (this.selectedEntity) {
        /**
         * Disable the '#selectionrect' div which gets rendered when the user is dragging its mouse.
         * Via the '#selectionrect' div the user can see which annotations he is selecting (multi-select).
         * But currently we are hovering an entity so we do not want to render the '#selectionrect'
         */
        this.setSelectionRectangleVisibility(false);
      }
      /**
       * The user is clicked and is currently dragging.
       */
      this.isDragging = true;
      if (this.selectedEntity) {
        /**
         * Create the drag element which gets rendered at the mouse position
         */
        this.dragElement = document.createElement('div');
        this.dragElement.setAttribute('id', this.dragElementId);
        this.dragElement.style.position = 'absolute';
        this.dragElement.style.display = 'inline-block';
        this.dragElement.style.width = this.selectedEntity.getWidth();
        this.dragElement.style.height = this.selectedEntity.getHeight();
        this.dragElement.style.backgroundColor = this.selectedEntity.StrokeColor.toHexString();
        this.dragElement.style.padding = '2px';
        this.dragElement.style.color = 'white';
        this.dragElement.style.fontSize = '10px';
        this.dragElement.style.opacity = '0.8';
        this.dragElement.innerText = this.selectedEntity.getContents();
        document.body.appendChild(this.dragElement);
      }
    });

    instance.annotManager.on('annotationSelected', (event) => {
      /**
       * This workaround is needed because if we disable the '#selectionrect' visibility, the functionality to select
       * multiple annotations is still given. We check if we currently have a selected entity (annotation). If that is
       * the case we just deselect all annotations.
       */
      if (this.selectedEntity) {
        this.destroyDragElement();
        instance.annotManager.deselectAllAnnotations();
      }
    });

    instance.docViewer.on('mouseLeftUp', (event: MouseEvent) => {
      /**
       * Check if the user selected an entity and dragged it to a new one
       */
      if (this.selectedEntity && this.isDragging) {
        /**
         * Get the target entity
         */
        const droppedOnAnnotation = instance.annotManager.getAnnotationByMouseEvent(event);
        /**
         * Check if the entities aren't equal. (otherwise it is possible to drag an entity to the same entity)
         */
        if (droppedOnAnnotation && this.selectedEntity.Id !== droppedOnAnnotation.Id) {
          console.log('emit event');
          this.draggedEntity$.emit('success');
        }
      }
      /**
       * The user does not drag the mouse anymore.
       * Also we enable the functionality to select text again and show the '#selectrect'
       */
      this.isDragging = false;
      instance.enableFeatures([instance.Feature.TextSelection]);
      this.setSelectionRectangleVisibility(true);
      // instance.enableElements(['annotationContentOverlay']);
    });
  }

  /**
   * Destroy the drag element which gets created in the 'LeftMouseDown'-event when an entity is clicked.
   */
  private destroyDragElement(): void {
    if (document.getElementById(this.dragElementId)) {
      document.body.removeChild(document.body.lastChild);
    }
    this.dragElement = null;
    this.selectedEntity = null;
  }

  /**
   * This method adds a css-class to the div element with the selector '.document' so we are able to show/hide the
   * '#selectionrect' div which gets rendered because currently there is no way to disable the '#selectionrect'. And to ensure
   * we dont render the '#selectionrect' while dragging an entity, we set it display: none
   * @param visible - true if the '#selectionrect' should be visible
   */
  private setSelectionRectangleVisibility(visible: boolean): void {
    const iframe = this.wvInstance.iframeWindow.document;
    const doc = iframe.querySelector('.document') as HTMLElement;
    if (doc !== null) {
      if (visible) {
        doc.classList.remove('selection-disabled');
      } else {
        doc.classList.add('selection-disabled');
      }
    }
  }

}
