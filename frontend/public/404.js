        (function(){
          var scene = document.getElementById('scene');
          function init(){
            if (scene && window.Parallax){
              new window.Parallax(scene);
            } else {
              var s = document.createElement('script');
              s.src = 'https://cdnjs.cloudflare.com/ajax/libs/parallax/3.1.0/parallax.min.js';
              s.onload = function(){ if (scene && window.Parallax){ new window.Parallax(scene); } };
              document.body.appendChild(s);
            }
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
          } else {
            init();
          }
        })();
