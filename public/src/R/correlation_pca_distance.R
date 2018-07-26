library(jsonlite,quietly=TRUE)
library(parallel)

getDistance <- function(x,gene.vec) {

    ## eu.dist <- sum((x - gene.vec)^2)
    corr.dist <- cor(x,gene.vec)

    return(corr.dist)

}

f <- file("stdin")

open(f)

num <- readLines(f,n=1)

close(f)

## num <- '2100'

datFile <- sprintf('private/tmp/incoming/entry_%s.tsv',num)

gene.dat <- read.table(datFile,header=F,sep='\t',row.names=1)

gene.vec <- gene.dat$V2
names(gene.vec) <- rownames(gene.dat)

var.genes <- readRDS('private/data/allen/pca/variable_genes_log_4k.RDS')

map.dat <- readRDS('private/data/allen/pca/allen_50_dim_4k_filtered_irlba.RDS')

rotation.dat <- readRDS('private/data/allen/pca/allen_rot_mat_filtered_log_4k.RDS')
rotation.dat <- rotation.dat[var.genes,]

map.params <- readRDS('private/data/allen/pca/pca_scaling_params.RDS')

map.centers <- map.params$col.center
map.centers <- map.centers[var.genes]

gene.vec <- gene.vec[var.genes]

gene.vec <- log(gene.vec + map.params$dec.cnst) - map.params$mag.cnst

gene.vec <- gene.vec - map.centers

rot.vec <- t(gene.vec) %*% rotation.dat

no_cores <- detectCores() - 1
cl <- makeCluster(no_cores)

dist.vec <- parApply(cl,map.dat,1,getDistance,gene.vec=rot.vec)

dist.vec <- data.frame(y=names(dist.vec),x=dist.vec)

## dist.vec[dist.vec$x==min(dist.vec$x),'x'] <- min(subset(dist.vec,x>1)$x)
## dist.vec$x <- log(dist.vec$x)
## dist.vec$x <- 1.01 ^ (max(dist.vec$x) - dist.vec$x)

## dist.vec$x <- 1.01^(dist.vec$x)

dist.vec$y <- gsub(".RDS","",dist.vec$y)
dist.vec$y <- gsub('^X([0-9]+)','\\1',dist.vec$y)
dist.vec$y <- gsub('\\.','-',dist.vec$y)

write.table(dist.vec,sprintf('private/tmp/outgoing/entry_%s.tsv',num),sep=',',col.names=F,row.names=F)

stopCluster(cl)

